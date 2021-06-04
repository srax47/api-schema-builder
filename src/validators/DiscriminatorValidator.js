
const Validator = require('./Validator'),
    validatorUtils = require('./validator-utils');

class DiscriminatorValidator extends Validator {
    constructor(schema) {
        super(discriminator, schema);
    }
}

function findSchemaValidation(tree, data) {
    const currentValue = tree.getValue();
    if (currentValue.discriminator){
        const discriminatorValue = data[currentValue.discriminator];
        if (!tree.getValue().allowedValues.includes(discriminatorValue)) {
            return { error: allowedValuesError(currentValue.discriminator, currentValue.allowedValues) };
        }
        if (tree.getValue().validators[discriminatorValue]) {
            return { validator: tree.getValue().validators[discriminatorValue] }
        }
        const newNode = tree.childrenAsKeyValue[discriminatorValue];
        return findSchemaValidation(newNode, data);
    }
    throw new Error('DEBUG: there is no discriminator on current value');
}

function discriminator(schemas, data) {
    const currentValue = schemas.getValue();
    const subDiscriminator = currentValue.discriminator && currentValue.discriminator.startsWith('.');
    if (!subDiscriminator) {
        const { validator } = findSchemaValidation(schemas, data);
        let result = false;
        if (validator) {
            result = validator(data);
            this.errors = validator.errors;
        }
        return result;
    }

    const validator = currentValue.validator;
    let result = validator(data);
    this.errors = validator.errors;
    if (!result) return result;

    const key = currentValue.discriminator.replace('.', '');
    schemas = Object.values(schemas.childrenAsKeyValue)[0];
    data = data[key];

    const errors = [];
    data.forEach((subData, index) => {
        const { validator, error } = findSchemaValidation.call(this, schemas, subData);
        if (validator) {
            result = result && validator(subData);
            validator.errors && errors.push(addErrorPrefix(validator.errors, key + `[${index}]`));
        } else if(error) {
            errors.push(addErrorPrefix([error], key + `[${index}]`));
            result = false;
        }
    });

    this.errors = errors.length ? errors.flat() : null;
    return result;
}

function addErrorPrefix(errors, prefix) {
    errors.forEach(error => {
        error.dataPath = '.' + prefix + error.dataPath;
        error.schemaPath = error.schemaPath.replace('#', '#/' + prefix);
    });
    return errors;
}

function allowedValuesError(discriminator, allowedValues) {
    const error = new Error('should be equal to one of the allowed values');
    error.dataPath = '.' + discriminator;
    error.keyword = 'enum';
    error.params = {
        allowedValues: allowedValues
    };
    error.schemaPath = '#/properties/' + discriminator;
    return error
}

module.exports = DiscriminatorValidator;
